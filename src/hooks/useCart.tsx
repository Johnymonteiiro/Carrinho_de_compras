import { error } from 'console';
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {

   const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  //Monitoranto o estado do carrinho:
  const prevCartRef = useRef<Product[]>();
  useEffect(()=>{
    prevCartRef.current = cart;
  })

  //Verificar o valor atual do carrinho:
  const cartPreviousValue = prevCartRef.current ?? cart;//na 1° passagem atribui o valor do cart, na 2° passagem atribui do prevCart;

  useEffect(()=> {
    //se o valor anterior comparando com a atual for diferente, atualizar o carrinho no localStorage:
    if(cartPreviousValue !== cart){
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))// atualizando no localStorage;
    }
  },[cart, cartPreviousValue]);



  const addProduct = async (productId: number) => {
    try {
      //Adicionar producto no carrinho
      const updatedCart = [...cart];

      //verificar se o produto existe no carrinho
      const productExist = updatedCart.find(product => product.id === productId);

       //varificar a quantidade no estoque
       const stock = await api.get(`/stock/${productId}`);
       const stockAmount = stock.data.amount;

       //Se o produto existir:
       const currentAmount = productExist ? productExist.amount : 0;// pegar a quaantidade de produto
       const amount = currentAmount + 1; //quantidade desejada
       
       //VERIFICANDO A QNT NO ESTOQUE:

       if(amount > stockAmount){
          toast.error('Quantidade solicitada fora de estoque');
          return;//parar a opreção
       }
      
      //VERIFICANDO SE O PRODUTO EXISTE:
       if(productExist){

         productExist.amount = amount; // se o produto existe, vai atualizar a quantidade do produto

       } else {//SE NÃO, ADICIONAR UM NOVO PRODUTO:
         const product = await api.get(`/products/${productId}`);

         const newProduct = {
           ...product.data,//pegar todos os dados retornado da api com o campo amount = 1, ver os campos no arquivo "types.ts"
           amount: 1,
         }

         updatedCart.push(newProduct);//adicionando o novo produto o carrinho

       }

       setCart(updatedCart);//mandando os dados no estado;

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {

     //Verificar se existe no carrinho antes de remover
     const updatedCart = [...cart];//mantendoa imutabilidade;

     const productIndex = updatedCart.findIndex(product => product.id === productId);
     //Se o elemento existir, vai retornar o seu indice no array, caso não existe vai retornar -1
     //Por isso a condição a baixo é >=:
     
     //SE ENCONTRAR FAZ:
     if(productIndex >= 0){

       updatedCart.splice(productIndex,1);//Vai apagar o indice encontrado e apenas um produto;
       setCart(updatedCart);
     } else {
        throw Error();//PULA LOGO PARA O CATCH
     }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

       if(amount <= 0){//sair imediatamente caso a quantidade do produto seja menor ou igual a zero;
        return;
       }
       
       //verificando o stock:
       const stock = await api.get(`/stock/${productId}`);
       const stockAmount = stock.data.amount;
       
       //Verificar a quantidade no stock:
       if(amount > stockAmount){//se a quatd for maior que o stock, sair imediatamente;
        toast.error('Quantidade solicitada fora de estoque');
        return;
       }

       const updatedCart = [...cart];//manipulação da imutabilidade
       const productExists = updatedCart.find(product => product.id === productId);
       
       //varificar se o produto existe:

       if(productExists){
         productExists.amount = amount;
         setCart(updatedCart);//atualizar o carrinho
       } else {
         //Se o produto não existir, mostra sms de erro:
         throw Error();
       }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
